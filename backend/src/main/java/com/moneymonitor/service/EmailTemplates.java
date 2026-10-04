package com.moneymonitor.service;

import com.moneymonitor.config.AppProperties;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Branded, translated emails. Table-based HTML with inline styles (what email clients support),
 * always paired with a plain-text version.
 */
@Component
@RequiredArgsConstructor
public class EmailTemplates {

    public record Email(String subject, String text, String html) {}

    private final Texts texts;
    private final AppProperties props;

    public Email verificationCode(Lang l, String name, String code) {
        String subject = texts.t(l, "e.verify.subject", code);
        String text = String.join("\n\n",
                texts.t(l, "e.hello", name), texts.t(l, "e.verify.body"), code, texts.t(l, "e.verify.expires"), footerText(l, false));
        String body = p(texts.t(l, "e.verify.body"))
                + "<div style=\"margin:26px 0;text-align:center\"><span style=\"display:inline-block;font-family:'Courier New',monospace;"
                + "font-size:34px;font-weight:700;letter-spacing:10px;color:#1e1b4b;background:#f1effe;border-radius:14px;padding:14px 22px\">"
                + esc(code) + "</span></div>"
                + small(texts.t(l, "e.verify.expires"));
        return new Email(subject, text, layout(l, texts.t(l, "e.verify.title"), name, body, false));
    }

    public Email passwordReset(Lang l, String name, String link, String token) {
        String subject = texts.t(l, "e.reset.subject");
        String text = String.join("\n\n",
                texts.t(l, "e.hello", name), texts.t(l, "e.reset.body"), link, texts.t(l, "e.reset.app", token),
                texts.t(l, "e.reset.expires"), footerText(l, false));
        String body = p(texts.t(l, "e.reset.body"))
                + button(texts.t(l, "e.reset.button"), link)
                + small(texts.t(l, "e.reset.app", "<code style=\"word-break:break-all\">" + esc(token) + "</code>"), false)
                + small(texts.t(l, "e.reset.expires"));
        return new Email(subject, text, layout(l, texts.t(l, "e.reset.title"), name, body, false));
    }

    /** An in-app notification (budget alert, goal reached, report ready…) sent by email too. */
    public Email notification(Lang l, String name, String title, String message, String link) {
        String url = appUrl(link);
        String text = String.join("\n\n", texts.t(l, "e.hello", name), title, message, url, footerText(l, true));
        String body = p(esc(message)) + button(texts.t(l, "e.notif.button"), url);
        return new Email(title, text, layout(l, esc(title), name, body, true));
    }

    /** Backend links are web routes ("/app/budgets"); make them absolute. */
    private String appUrl(String link) {
        String base = props.frontendUrl().replaceAll("/+$", "");
        return link == null || link.isBlank() ? base + "/app/dashboard" : base + (link.startsWith("/") ? link : "/" + link);
    }

    private String layout(Lang l, String title, String name, String body, boolean prefsHint) {
        boolean rtl = l == Lang.AR;
        String dir = rtl ? "rtl" : "ltr";
        String align = rtl ? "right" : "left";
        return """
                <!doctype html>
                <html lang="%s" dir="%s"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#eef0fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0b1030">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#eef0fb;padding:28px 12px">
                <tr><td align="center">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(30,41,99,.12)">
                    <tr><td style="background:linear-gradient(120deg,#06b6d4,#7c3aed 55%%,#d946ef);background-color:#7c3aed;padding:22px 28px">
                      <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.3px">◈ Money Monitor</span>
                    </td></tr>
                    <tr><td dir="%s" style="padding:30px 28px 10px;text-align:%s">
                      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0b1030">%s</h1>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.6">%s</p>
                      %s
                    </td></tr>
                    <tr><td dir="%s" style="padding:18px 28px 26px;text-align:%s;border-top:1px solid #eceefa">
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a91b5">%s</p>
                    </td></tr>
                  </table>
                </td></tr></table>
                </body></html>
                """.formatted(l.code(), dir, dir, align, title, esc(texts.t(l, "e.hello", name)), body, dir, align,
                footerHtml(l, prefsHint));
    }

    private String footerText(Lang l, boolean prefsHint) {
        return "— Money Monitor\n" + texts.t(l, "e.footer") + (prefsHint ? " " + texts.t(l, "e.footer.prefs") : "");
    }

    private String footerHtml(Lang l, boolean prefsHint) {
        return esc(texts.t(l, "e.footer")) + (prefsHint ? "<br>" + esc(texts.t(l, "e.footer.prefs")) : "");
    }

    private static String p(String html) {
        return "<p style=\"margin:0 0 14px;font-size:15px;line-height:1.6\">" + html + "</p>";
    }

    private static String small(String text) {
        return small(esc(text), true);
    }

    private static String small(String html, boolean last) {
        return "<p style=\"margin:" + (last ? "0" : "0 0 12px") + ";font-size:13px;line-height:1.6;color:#5b6390\">" + html + "</p>";
    }

    private static String button(String label, String url) {
        return "<div style=\"margin:24px 0\"><a href=\"" + esc(url) + "\" style=\"display:inline-block;background:#6d5cf6;color:#ffffff;"
                + "text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px\">" + esc(label) + "</a></div>";
    }

    private static String esc(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }
}
