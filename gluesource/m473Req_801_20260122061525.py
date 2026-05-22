import json
import os
import re
from urllib.request import urlopen, Request


# ===== 历史走势数据持久化 =====
HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oil_price_history.json")

# 初始种子数据（和前端之前写死的一致，保证切换后图表不断档）
SEED_DATA = {
    "dates": [
        "3/1", "3/8", "3/15", "3/22", "3/29",
        "4/5", "4/12", "4/19", "4/26",
        "5/3", "5/10", "5/17", "5/18"
    ],
    "price92": [7.89, 7.89, 7.72, 7.72, 7.55, 7.45, 7.45, 7.67, 7.89, 8.13, 8.13, 8.68, 8.68],
    "price95": [8.52, 8.52, 8.35, 8.35, 8.18, 8.08, 8.08, 8.30, 8.52, 8.76, 8.76, 9.31, 9.31]
}

FALLBACK_PRICES = {"92": 8.68, "95": 9.31, "98": 10.31, "0": 8.32}
FALLBACK_TIME = "2026-05-18"


def _load_history():
    """加载历史数据文件，不存在则用种子数据初始化"""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    # 文件不存在或损坏，写入种子数据
    _save_history(SEED_DATA)
    return dict(SEED_DATA)


def _save_history(data):
    """保存历史数据到文件"""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _to_date_label(time_str):
    """
    把 API 返回的时间字符串转成 M/D 格式，如 "2026-05-22" → "5/22"
    兼容多种格式。
    """
    if not time_str:
        return None
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", time_str)
    if m:
        return str(int(m.group(2))) + "/" + str(int(m.group(3)))
    m = re.search(r"(\d{1,2})/(\d{1,2})", time_str)
    if m:
        return m.group(0)
    return None


class Servlet:
    """获取山东泰安实时油价 - req=801"""

    def __init__(self, data):
        self.json_obj = json.loads(data) if data else {}

    def encode_handle(self, str_data):
        if str_data is None:
            return None
        try:
            return str_data.encode("latin1").decode("gbk")
        except UnicodeEncodeError:
            return str_data

    def fetch_taian_oil_price(self):
        """通过 RollTools API 获取山东油价"""
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        url = (
            "https://www.mxnzp.com/api/oil/search"
            "?province=%E5%B1%B1%E4%B8%9C"
            "&app_id=hnphnlejmipjjark"
            "&app_secret=S6UoQR90q3SL4KkaL7PalMPrVQC0j9OA"
        )
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urlopen(req, timeout=10, context=ctx)
        data = json.loads(resp.read().decode("utf-8"))

        if data.get("code") != 1:
            raise Exception("API 返回异常: " + data.get("msg", ""))

        raw = data["data"]
        prices = {}
        for k in ("92", "95", "98", "0"):
            api_key = "t" + k
            if api_key in raw:
                prices[k] = float(raw[api_key])

        update_time = data.get("updateTime", "")

        return prices, update_time

    def service(self):
        try:
            prices, update_time = self.fetch_taian_oil_price()

            if not prices:
                return self._fallback_response()

            # 追加到历史记录
            history = _load_history()
            date_label = _to_date_label(update_time)
            if date_label:
                # 去重：同一天不重复记录
                if not history["dates"] or history["dates"][-1] != date_label:
                    history["dates"].append(date_label)
                    history["price92"].append(prices.get("92"))
                    history["price95"].append(prices.get("95"))
                    _save_history(history)

            return {
                "status": 0,
                "msg": "ok",
                "data": {
                    "city": "泰安",
                    "province": "山东",
                    "prices": prices,
                    "updateTime": update_time,
                    "trend": history,
                },
            }

        except Exception as e:
            return self._fallback_response()

    def _fallback_response(self):
        """网络异常时返回缓存数据 + 历史走势"""
        history = _load_history()
        return {
            "status": 0,
            "msg": "网络异常，使用缓存数据",
            "data": {
                "city": "泰安",
                "province": "山东",
                "prices": FALLBACK_PRICES,
                "updateTime": FALLBACK_TIME + " (缓存)",
                "trend": history,
            },
        }
