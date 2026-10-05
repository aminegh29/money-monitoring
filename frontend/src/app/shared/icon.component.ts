import { Component, computed, input } from '@angular/core';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, Bell, BellRing, Bot, Calendar, CalendarRange,
  ChartColumn, ChartLine, ChartPie, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleX, Copy, Download,
  Ellipsis, Eye, EyeOff, FileDown, FileText, Gauge, Globe, HandCoins, House, Inbox, Info, KeyRound, Landmark, LayoutDashboard,
  Lightbulb, ListChecks, Lock, LogOut, LucideAngularModule, LucideIconData, Mail, Moon, Pencil, PiggyBank, Plus, Receipt,
  RefreshCw, Repeat, Search, Send, Settings, Shield, ShieldCheck, SlidersHorizontal, Smartphone, Sparkles, Sun, Tags, Target,
  Trash2, TrendingDown, TrendingUp, TriangleAlert, User, UserPlus, Users, Wallet, X, Zap,
} from 'lucide-angular';

/** The icons used in the app (Lucide, ISC licence). Add new ones here. */
const ICONS = {
  'arrow-down-right': ArrowDownRight, 'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight,
  'badge-check': BadgeCheck, banknote: Banknote, bell: Bell, 'bell-ring': BellRing, bot: Bot, calendar: Calendar,
  'calendar-range': CalendarRange, 'chart-column': ChartColumn, 'chart-line': ChartLine, 'chart-pie': ChartPie, check: Check,
  'chevron-down': ChevronDown, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'circle-check': CircleCheck,
  'circle-x': CircleX, copy: Copy, download: Download, ellipsis: Ellipsis, eye: Eye, 'eye-off': EyeOff, 'file-down': FileDown,
  'file-text': FileText, gauge: Gauge, globe: Globe, 'hand-coins': HandCoins, house: House, inbox: Inbox, info: Info,
  'key-round': KeyRound, landmark: Landmark, 'layout-dashboard': LayoutDashboard, lightbulb: Lightbulb, 'list-checks': ListChecks,
  lock: Lock, 'log-out': LogOut, mail: Mail, moon: Moon, pencil: Pencil, 'piggy-bank': PiggyBank, plus: Plus, receipt: Receipt,
  'refresh-cw': RefreshCw, repeat: Repeat, search: Search, send: Send, settings: Settings, shield: Shield,
  'shield-check': ShieldCheck, sliders: SlidersHorizontal, smartphone: Smartphone, sparkles: Sparkles, sun: Sun, tags: Tags,
  target: Target, trash: Trash2, 'trending-down': TrendingDown, 'trending-up': TrendingUp, 'triangle-alert': TriangleAlert,
  user: User, 'user-plus': UserPlus, users: Users, wallet: Wallet, x: X, zap: Zap,
} satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof ICONS;

/** <app-icon name="wallet" [size]="18" /> — inherits the text colour. */
@Component({
  selector: 'app-icon',
  imports: [LucideAngularModule],
  template: `<lucide-icon [img]="data()" [size]="size()" [strokeWidth]="stroke()" aria-hidden="true" />`,
  styles: [`:host { display: inline-flex; flex-shrink: 0; line-height: 0; }`],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  readonly stroke = input(1.75);
  readonly data = computed(() => ICONS[this.name()]);
}
