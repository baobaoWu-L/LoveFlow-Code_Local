"""
LoveFlowCode 本地模型推理服务器
基于 llama-cpp-python 提供 OpenAI 兼容 API
支持 CPU + CUDA GPU 加速

自动检测 CUDA 可用性，优先使用 GPU
"""
import os
import sys
import json
import time
import logging
from typing import Optional

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="[LoveFlowCode] %(message)s")
log = logging.getLogger(__name__)

# ===== 配置 =====
MODEL_PATH = os.environ.get(
    "LOVEFLOWCODE_MODEL_PATH",
    "D:\\LLM\\Qwen\\Negentropy-claude-opus-4.7-9B-Q8_0\\Negentropy-claude-opus-4.7-9B-Q8_0.gguf"
)
SERVER_HOST = os.environ.get("LOVEFLOWCODE_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("LOVEFLOWCODE_PORT", "8002"))
CONTEXT_SIZE = int(os.environ.get("LOVEFLOWCODE_CONTEXT_SIZE", "8192"))
GPU_LAYERS = int(os.environ.get("LOVEFLOWCODE_GPU_LAYERS", "-1"))  # -1 = 全部GPU
N_THREADS = int(os.environ.get("LOVEFLOWCODE_THREADS", "8"))
# =====

# 尝试 CUDA 加速
try:
    import torch
    if torch.cuda.is_available():
        vram = torch.cuda.get_device_properties(0).total_memory / 1e9
        log.info(f"检测到 GPU: {torch.cuda.get_device_name(0)}, VRAM: {vram:.1f}GB")
        if vram < 8:
            # 3060 只有 6GB，Q8_0 9B 需要部分卸载
            layers = max(1, int(GPU_LAYERS) if GPU_LAYERS > 0 else int(vram * 2))
            log.info(f"VRAM 有限，仅卸载 {layers} 层到 GPU")
            os.environ["GGML_CUDA_LAYERS"] = str(layers)
    else:
        log.info("未检测到 CUDA GPU，使用 CPU 推理")
except ImportError:
    log.info("PyTorch 未安装，使用 llama.cpp CPU 模式")

log.info(f"模型路径: {MODEL_PATH}")
log.info(f"服务器地址: http://{SERVER_HOST}:{SERVER_PORT}")

from llama_cpp import Llama

# 全局模型实例
llama: Optional[Llama] = None


def get_model() -> Llama:
    """延迟加载模型"""
    global llama
    if llama is not None:
        return llama

    log.info("正在加载模型...")
    start = time.time()

    # 检测 CUDA 支持
    n_gpu_layers = -1  # 默认全部
    try:
        import torch
        if torch.cuda.is_available():
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            if vram < 10:
                # 6GB VRAM: Q8_0 9B 需要 ~9GB, 卸载约 20 层
                n_gpu_layers = max(1, int((vram - 1) * 4))
                log.info(f"GPU VRAM {vram:.1f}GB, 卸载 {n_gpu_layers} 层到 GPU")
        else:
            n_gpu_layers = 0
    except:
        n_gpu_layers = 0

    llama = Llama(
        model_path=MODEL_PATH,
        n_ctx=CONTEXT_SIZE,
        n_gpu_layers=n_gpu_layers,
        n_threads=N_THREADS,
        verbose=False,
        chat_format="chatml",  # 使用 ChatML 格式
    )

    elapsed = time.time() - start
    log.info(f"模型加载完成! ({elapsed:.1f}秒)")
    return llama


def build_chatml(messages: list, system_prompt: Optional[str] = None) -> str:
    """构建 ChatML 格式提示词"""
    parts = []
    if system_prompt:
        parts.append(f"<|im_start|>system\n{system_prompt}<|im_end|>")
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        parts.append(f"<|im_start|>{role}\n{content}<|im_end|>")
    parts.append("<|im_start|>assistant\n")
    return "\n".join(parts)


def create_chat_completion(body: dict):
    """处理 /v1/chat/completions 请求"""
    messages = body.get("messages", [])
    max_tokens = body.get("max_tokens", 2048)
    temperature = body.get("temperature", 0.7)
    is_stream = body.get("stream", False)

    model = get_model()

    if is_stream:
        return stream_response(model, messages, max_tokens, temperature)
    else:
        return normal_response(model, messages, max_tokens, temperature)


def normal_response(model, messages, max_tokens, temperature):
    """非流式响应"""
    try:
        resp = model.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=["<|im_end|>"],
        )
        choice = resp["choices"][0]
        content = choice["message"].get("content", "")

        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "LoveFlow",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": choice.get("finish_reason", "stop"),
            }],
            "usage": resp.get("usage", {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            }),
        }
    except Exception as e:
        log.error(f"推理错误: {e}")
        return error_response(str(e))


def stream_response(model, messages, max_tokens, temperature):
    """流式响应 (SSE)"""
    try:
        stream = model.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=["<|im_end|>"],
            stream=True,
        )

        def generate():
            for chunk in stream:
                if "choices" in chunk and chunk["choices"]:
                    delta = chunk["choices"][0].get("delta", {})
                    yield {
                        "id": f"chatcmpl-{int(time.time())}",
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": "LoveFlow",
                        "choices": [{
                            "index": 0,
                            "delta": delta,
                            "finish_reason": chunk["choices"][0].get("finish_reason"),
                        }],
                    }
            yield {"done": True}

        return {"stream": generate()}
    except Exception as e:
        log.error(f"流式推理错误: {e}")
        return error_response(str(e))


def error_response(msg: str):
    return {
        "error": {"message": msg, "type": "server_error"},
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": f"模型推理出错: {msg}"},
            "finish_reason": "stop",
        }],
    }


# ===== HTTP 服务器 =====
from http.server import HTTPServer, BaseHTTPRequestHandler


class APIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # 去掉默认日志

    def _send_json(self, data: dict, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_sse(self, generator):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        for event in generator:
            if event.get("done"):
                self.wfile.write(b"data: [DONE]\n\n")
                break
            line = f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            self.wfile.write(line.encode("utf-8"))

    def do_GET(self):
        if self.path == "/v1/models":
            self._send_json({
                "object": "list",
                "data": [{
                    "id": "LoveFlow",
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "loveflowcode",
                }],
            })
        elif self.path == "/health":
            self._send_json({"status": "ok", "model_loaded": llama is not None})
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

        if self.path == "/v1/chat/completions":
            result = create_chat_completion(body)

            if isinstance(result, dict) and "stream" in result:
                self._send_sse(result["stream"])
            else:
                self._send_json(result)
        else:
            self._send_json({"error": "not found"}, 404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main():
    log.info("=" * 50)
    log.info("LoveFlowCode 模型推理服务器")
    log.info("=" * 50)

    server = HTTPServer((SERVER_HOST, SERVER_PORT), APIHandler)
    log.info(f"服务器已启动: http://{SERVER_HOST}:{SERVER_PORT}")

    # 后台预加载模型
    import threading
    threading.Thread(target=get_model, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("服务器关闭")
        server.server_close()


if __name__ == "__main__":
    main()
