import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Category } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, CategoryDot, confirm, IconButton, Loading, Notice, Row, Screen, Txt } from '@/components/ui';
import { catName, t, useI18n } from '@/i18n';
import { fonts } from '@/theme/theme';

export default function CategoriesScreen() {
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: qk.categories, queryFn: api.categories });
  const custom = (categories.data ?? []).filter((c) => c.custom);
  const defaults = (categories.data ?? []).filter((c) => !c.custom);

  const open = (c: Category | null) => router.push({ pathname: '/category-form', params: c ? { category: JSON.stringify(c) } : {} });

  const remove = (c: Category) =>
    confirm(t('categories.deleteTitle'), t('categories.deleteMsg', { name: c.name }), async () => {
      try {
        await api.deleteCategory(c.id);
        toast.success(t('categories.deleted'));
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  const row = (c: Category, editable: boolean) => (
    <Card key={c.id} style={{ paddingVertical: 12 }}>
      <Row gap={12}>
        <CategoryDot icon={c.icon} color={c.color} size={44} />
        <View style={{ flex: 1, gap: 5, alignItems: 'flex-start' }}>
          <Txt style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{catName(c.name)}</Txt>
          <Badge label={c.essential ? t('categories.essential') : t('categories.nonEssential')} tone={c.essential ? 'primary' : 'neutral'} />
        </View>
        {editable ? (
          <Row gap={0}>
            <IconButton icon="✏️" label={t('common.edit')} onPress={() => open(c)} />
            <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => remove(c)} />
          </Row>
        ) : null}
      </Row>
    </Card>
  );

  return (
    <Screen edges={[]} onRefresh={() => categories.refetch()} refreshing={categories.isRefetching}>
      <Txt variant="muted">{t('categories.subtitle')}</Txt>
      <Button title={t('categories.new')} icon="＋" onPress={() => open(null)} />
      {categories.isError ? <Notice tone="danger" text={errorMessage(categories.error)} /> : null}
      {categories.isLoading ? <Loading /> : null}

      {custom.length ? (
        <>
          <Txt variant="label" style={{ marginTop: 6 }}>{t('categories.yours')}</Txt>
          {custom.map((c) => row(c, true))}
        </>
      ) : null}

      {defaults.length ? (
        <>
          <Txt variant="label" style={{ marginTop: 6 }}>{t('categories.defaults')}</Txt>
          {defaults.map((c) => row(c, false))}
        </>
      ) : null}

      <Txt variant="small" style={{ marginTop: 4 }}>{t('categories.hint')}</Txt>
    </Screen>
  );
}
