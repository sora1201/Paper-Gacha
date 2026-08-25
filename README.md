# Paper Gacha

毎朝9:00（日本時間）に、研究論文10本をBlueskyの返信スレッドとして投稿する小さなBotです。無料の公開API（arXiv、OpenAlex、Semantic Scholar）とローカルの無料Embeddingモデルを使います。

## 内訳と選び方

- **専門 4本**：`PAPER_GACHA_EXPERTISE` に対して `all-MiniLM-L6-v2` の意味類似度で順位付けします。
- **関連 3本**：`PAPER_GACHA_RELATED` に同じ方法で順位付けします。
- **異分野 3本**：生物・物理・歴史・文化・言語の候補から、なるべく異なる分野をランダムに選びます。

各投稿はタイトル、一文要約、選定理由、分野/キーワード、リンクを含みます。`data/posted_papers.json` に投稿済みIDを保存して、次回以降に同じ候補を除外します。投稿ごとにデータを保存するため、GitHub Actionsにはリポジトリへの書き込み権限が必要です。

## GitHub Actions の設定

1. このフォルダを新しいGitHubリポジトリにpushします。
2. BlueskyでBot用の**App Password**を作ります（通常のパスワードは使いません）。
3. GitHubの **Settings → Secrets and variables → Actions** で、次のRepository secretsを追加します。
   - `BLUESKY_HANDLE` — 例: `your-bot.bsky.social`
   - `BLUESKY_APP_PASSWORD` — BlueskyのApp Password
   - `SEMANTIC_SCHOLAR_API_KEY` — 任意。未設定でも実行します。
4. 同じ画面の **Variables** に、次を追加します。
   - `PAPER_GACHA_EXPERTISE` — 例: `robotics, robot learning, embodied AI`
   - `PAPER_GACHA_RELATED` — 例: `computer vision, reinforcement learning, human-robot interaction`
5. Actionsの `Paper Gacha` を手動実行し、最初は `dry_run` をオンにして候補を確認します。

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

## 調整の目安

- 研究テーマを変える: `PAPER_GACHA_EXPERTISE` のカンマ区切り語句を変更。
- 関連の広さを変える: `PAPER_GACHA_RELATED` を変更。
- 異分野を変える: `paper_gacha.py` の `DIVERSE` に検索語を追加・変更。
- 類似度モデルを変える: `MODEL_NAME` をHugging FaceのSentence Transformers互換モデル名に変更。小さく無料の現行モデルを保つなら既定値がおすすめです。

## 運用上の注意

公開APIの一時的な制限や障害がある場合は、そのソースを飛ばして続行します。候補が10本に届かない場合は投稿せず失敗にするため、重複や中途半端な投稿を避けられます。
