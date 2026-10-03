import RNMarkdown from 'react-native-markdown-display';
import { fonts, useTheme } from '@/theme/theme';

/** Renders the AI advisor's Markdown with the app's fonts and colours. Raw HTML is not rendered. */
export function Markdown({ children, size = 14.5 }: { children: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <RNMarkdown
      style={{
        body: { color: colors.text, fontFamily: fonts.body, fontSize: size, lineHeight: size * 1.5 },
        heading1: { fontFamily: fonts.display, fontSize: size + 6, marginTop: 8, marginBottom: 6, color: colors.text },
        heading2: { fontFamily: fonts.display, fontSize: size + 4, marginTop: 8, marginBottom: 6, color: colors.text },
        heading3: { fontFamily: fonts.display, fontSize: size + 2, marginTop: 6, marginBottom: 4, color: colors.text },
        heading4: { fontFamily: fonts.semibold, fontSize: size + 1, marginTop: 6, marginBottom: 4, color: colors.text },
        strong: { fontFamily: fonts.bold, fontWeight: 'normal' },
        em: { fontStyle: 'italic' },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { marginVertical: 2 },
        paragraph: { marginTop: 0, marginBottom: 8 },
        code_inline: { backgroundColor: colors.surface3, color: colors.primaryText, borderRadius: 4, paddingHorizontal: 4 },
        blockquote: { backgroundColor: colors.primarySoft, borderLeftColor: colors.primary, borderLeftWidth: 3, paddingHorizontal: 10 },
        hr: { backgroundColor: colors.border, marginVertical: 10 },
        link: { color: colors.primaryText },
        table: { borderColor: colors.border },
        th: { padding: 6, borderColor: colors.border },
        td: { padding: 6, borderColor: colors.border },
        tr: { borderColor: colors.border },
      }}
      rules={{ html_inline: () => null, html_block: () => null }}
    >
      {children}
    </RNMarkdown>
  );
}
