# RTSG News Article Management

RTSG News is implemented as a feature module under the existing app. In development it is routed under `/news`; in production it also supports the `news.rtsg.org` host.

## Authentication

User authentication uses the existing JWT session cookie. On `rtsg.org` and subdomains, the cookie is issued for `.rtsg.org` so a signed-in admin remains signed in across `rtsg.org` and `news.rtsg.org`. Local development keeps the cookie host-only for `localhost`.

## Permissions

Only users with `role = "admin"` can create, draft, update, publish, feature, or delete News articles. Regular users can read published News articles but cannot access the creation controls.

## Schema

News content is stored in `news_articles`.

- `status`: `draft` or `published`
- `authorId`
- `tags`: JSON text array, included in search
- `category`
- `title`
- `subtitle`
- `coverImageUrl`
- `content`: HTML from the rich text editor
- `isPublished`: retained for compatibility with existing published filters

## API

The app uses tRPC, not REST. These are the equivalents of the requested endpoints:

- `news.create`: create a draft or published News article.
- `news.update`: update an existing News article or move it between draft and published states.
- `news.publishDraft`: publish a News draft.
- `articles.getUserDrafts`: fetches unified user drafts, including News drafts for admins.
- `upload.image`: server-side R2 image upload. News cover images use the `news/` object prefix.

REST-style mapping:

- `POST /api/news/articles` maps to `news.create`.
- `PUT /api/news/articles/:id` maps to `news.update`.
- `GET /api/user/profile` maps to `auth.me` plus `articles.getUserDrafts`.
