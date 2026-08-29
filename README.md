# Paper Gacha

毎朝9:00（日本時間）に、研究論文10本をBlueskyの返信スレッドとして投稿する小さなBotです。無料の公開API（arXiv、OpenAlex、Semantic Scholar）とローカルの無料Embeddingモデルを使います。

## 内訳と選び方

- **専門 4本**：`PAPER_GACHA_EXPERTISE` に対して `all-MiniLM-L6-v2` の意味類似度で順位付けします。
- **関連 3本**：`PAPER_GACHA_RELATED` に同じ方法で順位付けします。
- **異分野 3本**：生物・物理・歴史・文化・言語の候補から、なるべく異なる分野をランダムに選びます。

各投稿はタイトル、一文要約、選定理由、分野/キーワード、リンクを含みます。`data/posted_papers.json` に投稿済みIDを保存して、次回以降に同じ候補を除外します。投稿ごとにデータを保存するため、GitHub Actionsにはリポジトリへの書き込み権限が必要です。

## GitHub Actions の設定

1. このフォルダを新しいGitHubリポジトリにpushします。
2. GitHubの **Settings → Pages** で、Sourceを **GitHub Actions** に設定します。最初の通常実行後に論文ガチャの結果が公開されます。
3. Blueskyにも自動投稿する場合だけ、Bot用の**App Password**を作ります（通常のパスワードは使いません）。GitHubの **Settings → Secrets and variables → Actions** に、次のRepository secretsを追加します。
   - `BLUESKY_HANDLE` — 例: `your-bot.bsky.social`
   - `BLUESKY_APP_PASSWORD` — BlueskyのApp Password
   - `SEMANTIC_SCHOLAR_API_KEY` — 任意。未設定でも実行します。
4. 同じ画面の **Variables** で、論文選定を設定します。未設定の値は既定値を使います。

   | Variable | 既定値 | 説明 |
   | --- | --- | --- |
   | `PAPER_GACHA_EXPERTISE` | `robotics, robot learning, embodied AI` | 専門テーマ（カンマ区切り） |
   | `PAPER_GACHA_RELATED` | `computer vision, reinforcement learning, human-robot interaction` | 関連テーマ（カンマ区切り） |
   | `PAPER_GACHA_CORE_COUNT` | `4` | 専門論文の本数 |
   | `PAPER_GACHA_RELATED_COUNT` | `3` | 関連論文の本数 |
   | `PAPER_GACHA_SERENDIPITY_COUNT` | `3` | 異分野論文の本数 |
   | `PAPER_GACHA_LOOKBACK_DAYS` | `365` | 検索対象を遡る日数。各APIで公開日がある論文に適用 |
   | `PAPER_GACHA_SERENDIPITY_TOPICS` | `biology,physics,history,culture,language` | 異分野テーマ。選べる値は `biology`、`physics`、`history`、`culture`、`language` |
   | `PAPER_GACHA_CANDIDATES_PER_SOURCE` | `35` | 専門・関連で各データソースから取得する候補数 |
   | `PAPER_GACHA_SERENDIPITY_CANDIDATES_PER_SOURCE` | `15` | 異分野で各データソースから取得する候補数 |
   | `PAPER_GACHA_MINIMUM_ABSTRACT_CHARACTERS` | `30` | 候補に必要な要旨の最小文字数 |
   | `PAPER_GACHA_KEYWORD_MATCH_BONUS` | `0.03` | テーマ語が明示的に含まれる論文への加点 |
   | `PAPER_GACHA_MAX_POST_CHARACTERS` | `280` | Bluesky投稿を分割する基準文字数 |
   | `PAPER_GACHA_HISTORY_LIMIT` | `5000` | 重複防止のために保持する投稿済み論文ID数 |
   | `PAPER_GACHA_POST_TO_BLUESKY` | `true` | `false` にするとPagesだけを更新し、Blueskyへ自動投稿しない |
5. Actionsの `Paper Gacha` を手動実行します。最初は `dry_run` をオンにして候補を確認し、Pagesを初期化する実行では `dry_run` をオフにします。Blueskyを使わない場合は、`PAPER_GACHA_POST_TO_BLUESKY=false` を設定してください。

スケジュールはGitHub ActionsがUTCで解釈するため、`0 0 * * *` は日本時間9:00です。GitHub Actionsのスケジュール実行は、混雑時に多少遅れることがあります。

## ローカル実行

Python 3.11を推奨します。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
$env:BLUESKY_HANDLE = 'your-bot.bsky.social'
$env:BLUESKY_APP_PASSWORD = 'your-app-password'
$env:PAPER_GACHA_EXPERTISE = 'robotics,robot learning,embodied AI'
$env:PAPER_GACHA_DRY_RUN = 'true'
python paper_gacha.py
```

`.env` は値の控えとして使えますが、標準ライブラリだけでは自動読込されません。ローカル投稿時は上のように環境変数として設定してください。まず `PAPER_GACHA_DRY_RUN=true` で、投稿せず候補と本文を確認できます。

## GitHub Pages

通常実行ごとに、選んだ論文を静的サイトとして `docs/` に保存し、GitHub Pagesへデプロイします。サイトには論文ガチャの結果だけを公開し、SecretsやGitHub Variablesは含みません。

- `/` — 最新の論文ガチャ
- `/archive/YYYY-MM-DD.html` — 日別アーカイブ
- `/papers/` — 全履歴をタイトル、著者、カテゴリ、公開日、分野、キーワードでブラウザ内検索

各論文にはカテゴリ、タイトル、著者、公開日、分野・キーワード、出典、原典リンク、抽出した抄録冒頭を表示します。「Share on Bluesky」から、興味を持った論文だけを手動で共有できます。

## 調整の目安

- 研究テーマを変える: `PAPER_GACHA_EXPERTISE` のカンマ区切り語句を変更。
- 関連の広さを変える: `PAPER_GACHA_RELATED` を変更。
- 異分野を変える: `PAPER_GACHA_SERENDIPITY_TOPICS` を変更。
- 類似度モデルを変える: `MODEL_NAME` をHugging FaceのSentence Transformers互換モデル名に変更。小さく無料の現行モデルを保つなら既定値がおすすめです。

## 運用上の注意

公開APIの一時的な制限や障害がある場合は、そのソースを飛ばして続行します。候補が10本に届かない場合は投稿せず失敗にするため、重複や中途半端な投稿を避けられます。
