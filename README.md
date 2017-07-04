# Angular Pages
The static site generator that lets you mix Markdown, HTML, and Angular Components! Write your HTML or Markdown files and Angular Components with Routes will be generated to mimic the structure of those files in the `./pages` directory of your Angular Project.


## Install Angular Pages into an NG CLI generated Angular App
In the future we'll have an `angular-page init` command. For now, set up is manual.

- Run `npm install -g angular-pages gh-markdown-cli angular-cli`.
- If you haven't generated your project yet, run `ng new my-new-project && cd my-new-project`.
- create a `pages` directory at `./pages`.
- Run `angular-pages build` (always run in the root directory of your Angular project)
- ES6 and Angular import the `PagesRouterModule` at `./src/pages/pages-routing.module.ts` into `./src/app/app.module.ts` 

Optional:
- In your `package.json`, add `angular-pages build && ` to `npm build`.
- Set `useHash: false` in `app-routing.module.ts` if you are using a static server like Github Pages.
- Create a `./pages/index.md` file to create a root path.
- Coming soon: Add the `angular-pages build --watch & ng serve` to `npm start` 


## Write your pages
- Put any HTML or Mardown files in the `./pages` directory, run `angular-pages build` the script will create a Component and Route for that page in your Angular App. For example, if you had a Markdown page at `./pages/some-path/hello-world.md`, you would then see the rendered HTML when you go to the `/some-path/hello-world` in your app.
