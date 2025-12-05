# Dataspecer ![GitHub last commit](https://img.shields.io/github/last-commit/dataspecer/dataspecer) ![GitHub contributors](https://img.shields.io/github/contributors/dataspecer/dataspecer) [![test](https://github.com/dataspecer/dataspecer/actions/workflows/test.yml/badge.svg)](https://github.com/dataspecer/dataspecer/actions/workflows/test.yml) [![dataspecer.com](https://img.shields.io/badge/-dataspecer.com-informational)](https://dataspecer.com/)

A set of tools for effortless management and creation of data specifications.

Check our website [dataspecer.com](https://dataspecer.com/) for more information.

## Docker container

You can easily run the whole application in a Docker container.

If you just want to try it out for a while and don't care where the data is stored, use following command and then go open [http://localhost:3000/](http://localhost:3000/).

```bash
docker run -p3000:80 ghcr.io/dataspecer/ws
```

---

- The container exposes port 80.
- Mount `/usr/src/app/database` directory to your local directory that will be filled with `database.db` file and `stores` directory. If the directory is empty, files would be created. **You need to mkdir the mounted directory with the correct user**.
- If you want to run the Dataspecer under specific user, use `--user` with desired UID.
- You can specify base URL using `BASE_URL` env if you are hosting Dataspecer from a sub directory. If you are using reverse proxy, it is expected that the base path *is preserved*. (For example, `https://example.com/dataspecer-instance-1/schema` should point to `http://localhost:3001/dataspecer-instance-1/schema`)

Use the following docker run command:
```bash
docker run -it --name dataspecer -eBASE_URL=http://localhost/ --user "1000:1000" -v ./database:/usr/src/app/database -p80:80 ghcr.io/dataspecer/ws
```

Or use following docker-compose file
```yaml
services:
  dataspecer:
    image: ghcr.io/dataspecer/ws
    environment:
      BASE_URL: http://localhost
    user: "1000:1000"
    ports:
      - 80:80 # Change the first number to your desired port
    volumes:
      - ./database:/usr/src/app/database
```

### Tags

- `latest` (default) follows the `stable` branch
- `branch-main` follows the `main` branch with the latest updates. May contain unstable features!

## Documentation

Check [what to learn](./documentation/what-to-learn.md) - a simple guide on how to start working on the project.

## How to build locally

This repository is a monorepo - consisting of several packages, applications, and services that are build and developed separately, but depends on each other.

For more information about individual packages, applications, and services, please see the given directory. Each contains a README.md file with build instructions and additional documentation.

- [applications](./applications) - web clients
- [packages](./packages) - core and helper packages and individual generators
- [services](./services) - backend service (used by both web and cli clients)

The monorepo is managed by [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) and [Turborepo](https://turbo.build/repo/docs). Please see the individual packages for their build instructions.

You can check the [Cloudflare's build script](./cloudflare.build.sh) that deploys all applications. We use [Cloudflare Pages](https://pages.cloudflare.com/) for that. Any commit pushed to GitHub into the repository is automatically built, and changes are deployed to the internet. Commits to other branches are also deployed as previews.

### In general

Your `node -v` should be at least `v22`.

After cloning the repository you should create local config files. Please see individual applications or packages what to do.

Then
- Run `npm install` to install all external packages (including TypeScript for typechecking and Turborepo for building) and link all dependencies between local packages.
- Run `npm run build` to build everything. This will execute `turbo build` under the hood. This will build packages, which are necessary for the development of other packages and applications; and it also build applications themselves, which is not necessary for development (see the next step). (If you want to build only packages necessary for a specific package or application, use `npx turbo run build --filter=<package-name>`. Obtain the name of the package from `package.json` file.)

To develop a concrete package or application, there is *usually* an `npm run dev` script that will run live server, which updates everything. See individual packages for more details.

# Acknowledgments

<p align="left">
  <img src="https://webcentrum.muni.cz/media/3831863/seda_eosc.png" alt="EOSC CZ Logo" height="90">
</p>

---
This project output was developed with financial contributions from the [EOSC CZ](https://www.eosc.cz/projekty/narodni-podpora-pro-eosc) initiative through the project **National Repository Platform for Research Data** (CZ.02.01.01/00/23_014/0008787) founded by Programme Johannes Amos Comenius (P JAC) of the Ministry of Education, Youth and Sports of the Czech Republic (MEYS).

---

<p align="left">
  <img src="https://webcentrum.muni.cz/media/3832168/seda_eu-msmt_eng.png" alt="EU and MŠMT Logos" height="90">
</p>
