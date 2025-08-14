import type {
    ActionFunctionArgs,
    LoaderFunctionArgs,
  } from "@remix-run/router";
  import type { clientLoader, clientAction } from "../edit_route";

  export namespace Route {
    export type ClientLoaderArgs = LoaderFunctionArgs;
    export type ClientActionArgs = ActionFunctionArgs;

    export type ComponentProps = {
      loaderData: Awaited<ReturnType<typeof clientLoader>>;
      actionData: Awaited<ReturnType<typeof clientAction>>;
    };
  }
