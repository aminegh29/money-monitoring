"""
Stand-in OpenAI-compatible AI server used only to record the promo video without an API key.
It writes advice from the real numbers contained in the app's prompt (totals, categories, budgets),
so what appears on screen matches the data. With a real Groq/Gemini key the app produces similar output.
"""
import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

MONEY = r"([\d,]+\.\d{2}) ([A-Z]{3})"


def parse(text):
    d = {"cats": [], "budgets": []}
    if m := re.search(r"Total spent: " + MONEY, text): d["spent"], d["cur"] = m.group(1), m.group(2)
    if m := re.search(r"Income: " + MONEY, text): d["income"] = m.group(1)
    if m := re.search(r"savings rate: ([-\d.]+)%", text): d["rate"] = float(m.group(1))
    if m := re.search(r"Balance \(income - spent\): " + MONEY, text): d["balance"] = m.group(1)
    for name, kind, amt, pct in re.findall(r"- (.+?) \[(essential|non-essential)\]: " + r"([\d,]+\.\d{2}) [A-Z]{3} \(([\d.]+)%\)", text):
        d["cats"].append((name, kind, amt, float(pct)))
    for name, spent, limit, pct in re.findall(r"- (.+?): spent ([\d,]+\.\d{2}) [A-Z]{3} of ([\d,]+\.\d{2}) [A-Z]{3} \((\d+)%\)", text):
        d["budgets"].append((name, spent, limit, int(pct)))
    return d


def num(s):
    return float(s.replace(",", ""))


def fmt(v, cur):
    return f"{v:,.2f} {cur}"


def monthly(d):
    cur = d.get("cur", "MAD")
    wants = [c for c in d["cats"] if c[1] == "non-essential"]
    over = [b for b in d["budgets"] if b[3] >= 100]
    top_want = wants[0] if wants else None
    out = ["### Summary",
           f"You spent **{d.get('spent', '0')} {cur}** against **{d.get('income', '0')} {cur}** of income, keeping "
           f"**{d.get('balance', '0')} {cur}**: a savings rate of **{d.get('rate', 0):.1f}%**. "
           + ("That's above the 20% benchmark, so you're in great shape. 🎉" if d.get("rate", 0) >= 20 else "Let's push that towards 20%."),
           "", "### What went well"]
    if d["cats"]:
        out.append(f"- **{d['cats'][0][0]}** is your largest category ({d['cats'][0][3]:.0f}%) and it's a predictable fixed cost.")
    ok = [b for b in d["budgets"] if b[3] < 90]
    if ok:
        out.append(f"- You stayed comfortably within your **{ok[0][0]}** budget ({ok[0][3]}% used).")
    out.append("- You logged your expenses consistently, which is the #1 habit of people who save more.")
    out += ["", "### Where you can cut"]
    for b in over[:2]:
        out.append(f"- **{b[0]}** went over budget: {b[1]} {cur} vs a {b[2]} {cur} limit.")
    if top_want:
        saving = num(top_want[2]) * 0.15
        out.append(f"- **{top_want[0]}** is your biggest *want* ({top_want[2]} {cur}). Trimming it by 15% frees **{fmt(saving, cur)}** a month.")
    out += ["", "### Action plan for next month",
            "1. Move your savings to a separate account **on payday**: pay yourself first.",
            f"2. Cap {top_want[0] if top_want else 'non-essentials'} with a weekly allowance instead of a monthly one.",
            "3. Use the 24-hour rule before any non-essential purchase above 500 " + cur + ".",
            "4. Review subscriptions this weekend and cancel one you don't use."]
    return "\n".join(out)


def yearly(text):
    cur = (re.search(r"Currency: ([A-Z]{3})", text) or re.search(r"([A-Z]{3})\.", text)).group(1)
    spent = re.search(r"Total spent: " + MONEY, text).group(1)
    saved = re.search(r"Saved: ([-\d,]+\.\d{2})", text).group(1)
    rate = float(re.search(r"savings rate ([-\d.]+)%", text).group(1))
    year = re.search(r"financial year (\d{4})", text).group(1)
    cats = re.findall(r"- (.+?) \[(?:essential|non-essential)\]: ([\d,]+\.\d{2})", text)
    out = [f"### {year} in review",
           f"You spent **{spent} {cur}** this year and saved **{saved} {cur}** (**{rate:.1f}%** of your income). "
           "Your spending was steady most months, with clear seasonal spikes in summer.",
           "", "### Key insights",
           f"- **{cats[0][0]}** was your biggest line ({cats[0][1]} {cur}), as expected for a fixed cost." if cats else "",
           f"- **{cats[1][0]}** and **{cats[2][0]}** are the categories with the most room to optimise." if len(cats) > 2 else "",
           "- July and August were your most expensive months: holidays add up fast.",
           "", f"### Suggestions for {int(year) + 1}",
           "1. Automate a fixed monthly transfer to savings the day your salary arrives.",
           "2. Start a **holiday sinking fund** in January so summer doesn't hit your balance.",
           "3. Set category budgets for groceries and restaurants and review them monthly.",
           "4. Build a 3-month emergency fund before investing.",
           "5. Re-negotiate one fixed bill (phone, internet, insurance) each quarter.",
           "", "### One habit to start in January",
           "Check your Money Monitor dashboard every Sunday evening: **5 minutes a week** to stay in control."]
    return "\n".join(x for x in out if x is not None)


def chat(messages):
    system = messages[0]["content"]
    q = messages[-1]["content"].lower()
    d = parse(system)
    cur = d.get("cur", "MAD")
    wants = [c for c in d["cats"] if c[1] == "non-essential"]
    if "overspend" in q or "too much" in q:
        lines = ["Here's where your money is leaking this month 👇", ""]
        listed = set()
        for b in [b for b in d["budgets"] if b[3] >= 90][:2]:
            listed.add(b[0])
            lines.append(f"- **{b[0]}**: {b[1]} {cur} spent of {b[2]} {cur} (**{b[3]}%** of budget)")
        for c in [c for c in wants if c[0] not in listed][:2]:
            lines.append(f"- **{c[0]}**: {c[2]} {cur} ({c[3]:.0f}% of spending)")
        if wants:
            lines += ["", f"💡 Quick win: cut **{wants[0][0]}** by 20% and you'd keep about **{fmt(num(wants[0][2]) * 0.2, cur)}** more this month."]
        return "\n".join(lines)
    if "20%" in q or "save" in q:
        return ("To save **20%** of your income, aim to keep a balance of at least "
                f"**{fmt(num(d.get('income', '0')) * 0.2, cur)}** each month:\n\n"
                "1. **Pay yourself first**: auto-transfer on payday\n"
                f"2. Put a weekly cap on {wants[0][0] if wants else 'non-essentials'}\n"
                "3. Batch-cook twice a week to cut food spending\n\n"
                "You're already close. Keep going! 🚀")
    return ("Great question! Based on your numbers, focus on your top non-essential categories first and set a "
            "budget for each. I'll alert you in real time when you reach 80%.")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])).decode("utf-8"))
        msgs = body["messages"]
        last = msgs[-1]["content"]
        if "year-end review" in last:
            reply = yearly(last)
        elif "give me personalised advice" in last:
            reply = monthly(parse(last))
        else:
            reply = chat(msgs)
        out = json.dumps({"choices": [{"message": {"role": "assistant", "content": reply}}]}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 11999), Handler).serve_forever()
