# Angular Pages
The static site generator that lets you mix Markdown, HTML, and Angular Components! Write your HTML or Markdown files and Angular Components with Routes will be generated to mimic the structure of those files in the `./pages` directory of your Angular Project.


## Install Angular Pages into an NG CLI generated Angular App
Prequisites:
- Node 8 (nodejs.org)

In the future we'll have an `angular-page init` command. For now, set up is manual.

- Run `npm install -g angular-pages gh-markdown-cli angular-cli`.
- If you haven't generated your project yet, run `ng new my-new-project && cd my-new-project`.
- create a `pages` directory at `./pages`.
- Run `angular-pages build` (always run in the root directory of your Angular project)
- ES6 and Angular import the `PagesRouterModule` at `./src/pages/pages-routing.module.ts` into `./src/app/app.module.ts` 

Optional:
- In your `package.json`, add `angular-pages build && ` to `npm build`.
- Add the `angular-pages build --watch & ng serve` to `npm start` 
- Set `imports: [RouterModule.forRoot(routes, { useHash: true })],` in `app-routing.module.ts` if you are using a static server like Github Pages. This will make sure URLs are formed like `foo.com/#/my-angular-route/` as opposed to `foo.com/my-angular-route`.  If you did not set `useHash` to `true` and a user hits reload in their browser on `foo.com/my-angular-route`, that will cause the browser to ask the static server for `foo.com/my-angular-route/index.html` because of how static web servers work.
- Create a `./pages/index.md` file to create a root path.


## Write your pages
- Put any HTML or Mardown files in the `./pages` directory, run `angular-pages build` the script will create a Component and Route for that page in your Angular App. For example, if you had a Markdown page at `./pages/some-path/hello-world.md`, you would then see the rendered HTML when you go to the `/some-path/hello-world` in your app.
