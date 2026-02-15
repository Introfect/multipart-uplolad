import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { clearApiKeyCookie } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect("/", {
    headers: {
      "Set-Cookie": await clearApiKeyCookie(request),
    },
  });
}
