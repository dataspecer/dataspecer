---
title: "Demo site ⚡"
url: "/demo/"
---

Please be aware that any changes made in the demo may be removed at any time. Also, please do not interact with others' work. Create your data specifications.

<p style="text-align:center">
   <a class="btn btn-primary btn-lg px-4 mb-2" href="https://demo.dataspecer.com" role="button">Go to the demo instance</a>
</p>

## What to do?

Because the tool is constantly evolving, we do not have detailed and up to date instructions on how to work with Dataspecer. However, you can check tutorials and scenarios to our demo scientific publications.

- [2022: Structure modeling tutorial.](/docs/tutorial/start/)
- [2024: Creating a vocabulary, reusing other vocabularies, and creating an application profile.](/papers/iswc2024/)
- [2026: Change propagation in application profiles.](/papers/iswc2026/)

## How to run Dataspecer locally?

Use `ghcr.io/dataspecer/ws` Docker image and expose port 80.

```
docker run -p3000:80 ghcr.io/dataspecer/ws
```

Or use the full config

```
docker run --user=$(id -u) -v ./database:/usr/src/app/database -p3000:80 ghcr.io/dataspecer/ws
```