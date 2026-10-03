package com.moneymonitor.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import java.awt.Color;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Shared fonts, colors and building blocks for the PDF reports. */
final class PdfStyles {

    private PdfStyles() {}

    static final Color PRIMARY = new Color(79, 70, 229);
    static final Color PRIMARY_LIGHT = new Color(238, 242, 255);
    static final Color SUCCESS = new Color(16, 185, 129);
    static final Color DANGER = new Color(239, 68, 68);
    static final Color WARNING = new Color(245, 158, 11);
    static final Color TEXT = new Color(15, 23, 42);
    static final Color MUTED = new Color(100, 116, 139);
    static final Color BORDER = new Color(226, 232, 240);
    static final Color ZEBRA = new Color(248, 250, 252);

    static final Font H1 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Color.WHITE);
    static final Font H1_SUB = FontFactory.getFont(FontFactory.HELVETICA, 11, new Color(224, 231, 255));
    static final Font H2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, TEXT);
    static final Font H3 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, PRIMARY);
    static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, TEXT);
    static final Font BODY_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, TEXT);
    static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
    static final Font TH = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
    static final Font KPI_LABEL = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, MUTED);
    static final Font KPI_VALUE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, TEXT);

    /** Standard PDF fonts only cover Latin-1; replace or drop anything else (emojis, math symbols). */
    static String clean(String s) {
        return latin1(s).trim();
    }

    private static String latin1(String s) {
        if (s == null) return "";
        String r = s.replace("≤", "<=").replace("≥", ">=").replace("→", "->").replace("–", "-").replace("—", "-")
                .replace("’", "'").replace("‘", "'").replace("“", "\"").replace("”", "\"").replace("…", "...")
                .replace("•", "-").replace(" ", " ");
        StringBuilder sb = new StringBuilder(r.length());
        r.codePoints().forEach(cp -> {
            if (cp < 256) sb.appendCodePoint(cp);
        });
        return sb.toString();
    }

    static PdfPTable header(String title, String subtitle, String right) {
        PdfPTable t = new PdfPTable(new float[]{3, 1.4f});
        t.setWidthPercentage(100);
        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.setBackgroundColor(PRIMARY);
        left.setPadding(16);
        left.addElement(new Paragraph("MONEY MONITOR", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(199, 210, 254))));
        left.addElement(new Paragraph(clean(title), H1));
        left.addElement(new Paragraph(clean(subtitle), H1_SUB));
        PdfPCell r = new PdfPCell();
        r.setBorder(Rectangle.NO_BORDER);
        r.setBackgroundColor(PRIMARY);
        r.setPadding(16);
        r.setVerticalAlignment(Element.ALIGN_BOTTOM);
        Paragraph p = new Paragraph(clean(right), H1_SUB);
        p.setAlignment(Element.ALIGN_RIGHT);
        r.addElement(p);
        t.addCell(left);
        t.addCell(r);
        t.setSpacingAfter(14);
        return t;
    }

    record Kpi(String label, String value, Color accent) {}

    static PdfPTable kpis(List<Kpi> items) {
        PdfPTable t = new PdfPTable(items.size());
        t.setWidthPercentage(100);
        t.setSpacingAfter(16);
        for (Kpi k : items) {
            PdfPCell c = new PdfPCell();
            c.setBorderColor(BORDER);
            c.setBorderWidthLeft(3);
            c.setBorderColorLeft(k.accent());
            c.setPadding(10);
            c.addElement(new Paragraph(clean(k.label()), KPI_LABEL));
            Font f = new Font(KPI_VALUE);
            f.setColor(k.accent() == PRIMARY ? TEXT : k.accent());
            c.addElement(new Paragraph(clean(k.value()), f));
            t.addCell(c);
        }
        return t;
    }

    static Paragraph section(String title) {
        Paragraph p = new Paragraph(clean(title), H2);
        p.setSpacingBefore(8);
        p.setSpacingAfter(8);
        return p;
    }

    static PdfPTable table(float[] widths, String... headers) {
        PdfPTable t = new PdfPTable(widths);
        t.setWidthPercentage(100);
        t.setHeaderRows(1);
        t.setSpacingAfter(14);
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, TH));
            c.setBackgroundColor(PRIMARY);
            c.setBorderColor(PRIMARY);
            c.setPadding(6);
            t.addCell(c);
        }
        return t;
    }

    static PdfPCell cell(String text, Font font, int align, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(clean(text), font));
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setBorderColor(BORDER);
        c.setPadding(5);
        if (bg != null) c.setBackgroundColor(bg);
        return c;
    }

    /** A horizontal progress bar cell (0-100). */
    static PdfPCell barCell(double percent, Color color, Color bg) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(BORDER);
        c.setPadding(6);
        c.setMinimumHeight(18);
        if (bg != null) c.setBackgroundColor(bg);
        double p = Math.max(0, Math.min(100, percent));
        c.setCellEvent((cell, pos, canvases) -> {
            PdfContentByte cb = canvases[PdfPTable.BACKGROUNDCANVAS];
            float x = pos.getLeft() + 6, w = pos.getWidth() - 12, h = 7;
            float y = pos.getBottom() + (pos.getHeight() - h) / 2;
            cb.saveState();
            cb.setColorFill(BORDER);
            cb.roundRectangle(x, y, w, h, 3);
            cb.fill();
            if (p > 0) {
                cb.setColorFill(color);
                cb.roundRectangle(x, y, (float) (w * p / 100), h, 3);
                cb.fill();
            }
            cb.restoreState();
        });
        return c;
    }

    /** Vertical bar chart drawn inside a table cell. Each series is drawn side by side per label. */
    static PdfPTable barChart(List<String> labels, List<double[]> series, List<Color> colors, float height,
                              Function<Double, String> axisFormat) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingAfter(12);
        PdfPCell c = new PdfPCell();
        c.setFixedHeight(height);
        c.setBorderColor(BORDER);
        double max = series.stream().flatMapToDouble(java.util.Arrays::stream).max().orElse(0);
        c.setCellEvent((cell, pos, canvases) -> {
            PdfContentByte cb = canvases[PdfPTable.LINECANVAS];
            float left = pos.getLeft() + 48, right = pos.getRight() - 10;
            float bottom = pos.getBottom() + 22, top = pos.getTop() - 12;
            float chartH = top - bottom;
            BaseFont bf = axisFont();
            cb.saveState();
            // grid + axis labels
            for (int i = 0; i <= 4; i++) {
                float y = bottom + chartH * i / 4;
                cb.setColorStroke(BORDER);
                cb.setLineWidth(0.5f);
                cb.moveTo(left, y);
                cb.lineTo(right, y);
                cb.stroke();
                cb.beginText();
                cb.setFontAndSize(bf, 6.5f);
                cb.setColorFill(MUTED);
                cb.showTextAligned(Element.ALIGN_RIGHT, axisFormat.apply(max * i / 4), left - 4, y - 2, 0);
                cb.endText();
            }
            int n = labels.size();
            if (n == 0 || max <= 0) {
                cb.restoreState();
                return;
            }
            float slot = (right - left) / n;
            float groupW = slot * 0.7f;
            float barW = groupW / series.size();
            for (int i = 0; i < n; i++) {
                float gx = left + slot * i + (slot - groupW) / 2;
                for (int s = 0; s < series.size(); s++) {
                    double v = series.get(s)[i];
                    float h = (float) (chartH * v / max);
                    if (h > 0) {
                        cb.setColorFill(colors.get(s));
                        cb.rectangle(gx + barW * s + 0.5f, bottom, Math.max(barW - 1, 0.8f), h);
                        cb.fill();
                    }
                }
                if (n <= 12 || i % 2 == 0) {
                    cb.beginText();
                    cb.setFontAndSize(bf, 6.5f);
                    cb.setColorFill(MUTED);
                    cb.showTextAligned(Element.ALIGN_CENTER, labels.get(i), left + slot * i + slot / 2, bottom - 10, 0);
                    cb.endText();
                }
            }
            cb.restoreState();
        });
        t.addCell(c);
        return t;
    }

    private static BaseFont axisFont() {
        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static final Pattern NUMBERED = Pattern.compile("^(\\d+)[.)]\\s+(.*)");

    /** Renders the small Markdown subset produced by the advisor (headings, bullets, bold). */
    static List<Element> markdown(String md) {
        List<Element> out = new ArrayList<>();
        com.lowagie.text.List list = null;
        for (String raw : md.split("\\R")) {
            String line = raw.strip();
            if (line.isEmpty() || line.matches("^[-*_]{3,}$")) {
                if (list != null) { out.add(list); list = null; }
                continue;
            }
            Matcher num = NUMBERED.matcher(line);
            boolean bullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("+ ");
            if (bullet || num.matches()) {
                if (list == null) {
                    list = new com.lowagie.text.List(false, 12);
                    list.setListSymbol(new Chunk("•  ", BODY_BOLD));
                }
                String text = bullet ? line.substring(2) : num.group(1) + ". " + num.group(2);
                ListItem item = new ListItem(inline(text));
                item.setSpacingAfter(3);
                list.add(item);
                continue;
            }
            if (list != null) { out.add(list); list = null; }
            if (line.startsWith("#")) {
                Paragraph p = new Paragraph(clean(line.replaceAll("^#+\\s*", "").replace("**", "")), H3);
                p.setSpacingBefore(8);
                p.setSpacingAfter(4);
                out.add(p);
            } else {
                Paragraph p = new Paragraph(inline(line));
                p.setSpacingAfter(4);
                p.setLeading(13);
                out.add(p);
            }
        }
        if (list != null) out.add(list);
        return out;
    }

    private static Phrase inline(String text) {
        Phrase p = new Phrase();
        p.setLeading(13);
        // Split on **bold** markers: odd parts are bold. Single *italic* markers are simply removed.
        String[] parts = text.replace("__", "**").split("\\*\\*", -1);
        for (int i = 0; i < parts.length; i++) {
            String s = latin1(parts[i].replace("`", "").replaceAll("(?<![\\w*])\\*([^*\\s][^*]*?)\\*(?![\\w*])", "$1"));
            if (!s.isEmpty()) {
                p.add(new Chunk(s, i % 2 == 1 ? BODY_BOLD : BODY));
            }
        }
        return p;
    }

    /** Footer with page numbers on every page. */
    static class Footer extends PdfPageEventHelper {
        private final String text;

        Footer(String text) {
            this.text = clean(text);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            float y = document.bottomMargin() - 18;
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase(text, SMALL), document.leftMargin(), y, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase("Page " + writer.getPageNumber(), SMALL),
                    document.right(), y, 0);
        }
    }
}
