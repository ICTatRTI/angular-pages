# Angular Pages
Build an angular site from a folder of HTML or Markdown files. Routes are automatically generated to mimic the structure of those files in the `./src/pages` directory.


## Install Angular Pages into your Angular App
In the future we'll have an `angular-page init` command. For now, set up is manual.

- Run `npm install --save angular-pages`.
- create a `pages` directory.
- create a `pages/index.md` file.
- Run `angular-pages build`
- Set the '/' route to the `AngularMarkdownPageIndexComponent` in `app-routing.module.ts`.
- Set `useHash: false` in `app-routing.module.ts` if you are using a static server like Github Pages.
- In your `package.json`, add `angular-markdown-pages build && ` to `npm build`.
- Coming soon: Add the `angular-pages build --watch && ` to `npm start` 


## Write your pages
Put any HTML or Mardown files in the `./src/pages` directory, run `angular-pages build` the script will create a Component and Route for that page in your Angular App. For example, if you had a Markdown page at `./src/pages/some-path/hello-world.md`, you would then see the rendered HTML when you go to the `/some-path/hello-world` in your app.
