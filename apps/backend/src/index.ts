import { Scalar } from "@scalar/hono-api-reference";
import { getHono } from "./utils/hono";
import { authEndpoint } from "./endpoints/auth";
import { userEndpoint } from "./endpoints/user";
import { cors } from "hono/cors";

const app = getHono();

app.use('*', cors({
  origin: ["*"]
}));

app.doc("/doc", {
  info: {
    title: "Partnership navigation API",
    description: "API for the Partnership navigation app",
    version: "0.0.1",
  },
  openapi: "3.1.0",
});

app.route("api/v1/auth", authEndpoint);
app.route("api/v1/user", userEndpoint);

app.get("/api", Scalar({ url: "/doc", theme: "elysiajs", layout: "classic" }));

export default app;
