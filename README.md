# Lost Cities（ロストシティ）

Next.js と Tailwind CSS で作ったボードゲーム「ロストシティ」の GUI とロジックです。  
**Supabase を使ったリアルタイム対戦**に対応しています。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## Supabase の準備

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. **Settings → API** から Project URL と anon public key をコピーし、`.env.local` に設定する
3. **SQL Editor** で `supabase/migrations/20250116000000_create_lost_cities_games.sql` の内容を実行してテーブルを作成する
4. **Database → Replication** で `lost_cities_games` テーブルの Realtime を有効にする

## 遊び方（リアルタイム対戦）

- **ロビー**（トップページ）で「ゲームを作成 (Host)」または「ゲームに参加 (Join)」を選ぶ
- **Host**: ゲームを作成するとゲームIDが表示される。相手にIDを伝えて参加してもらう
- **Join**: 相手から受け取ったゲームIDを入力して「参加」する
- Host = Player 1、Join = Player 2。手番は **current_turn** に従い、自分の手番のときだけカードのプレイ・ドローができる（排他制御）
- 相手の手札は**枚数のみ表示**し、カードはすべて裏向きで表示される
- 手順: 手札をクリックして選択 → 置き場（自分の遠征路 or 捨て札）をクリック → 山札または捨て札の一番上をクリックして1枚引く

## 構成

- `app/page.tsx` - ロビー（ゲーム作成 / 参加）
- `app/game/[id]/page.tsx` - 対戦画面（Supabase Realtime で状態同期）
- `lib/supabase.ts` - Supabase クライアント（環境変数で初期化）
- `lib/gameDb.ts` - ゲームの CRUD と状態更新
- `lib/useGameRealtime.ts` - `postgres_changes` による購読
- `app/gameLogic.ts` - 山札生成・出札・捨札・ドロー・得点計算
- `app/types.ts` - カード・ゲーム状態の型
- `app/components/Card.tsx` - カード表示（重厚感・縦並びオーバーラップ・視認性を維持）

UI デザイン（重厚感、カードの縦並び、捨て札クリックでドローなど）は従来どおり維持しています。
