import { Redirect } from 'expo-router';

// The ＋ tab button opens the expense form directly; this route only exists so the tab can be declared.
export default function AddTab() {
  return <Redirect href="/expense-form" />;
}
