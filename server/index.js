import { createApp } from "./app.js";
const { app } = createApp(process.env.DB_PATH || "data/progress.sqlite");
app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Bible reading API listening on port " + (process.env.PORT || 3001),
  ),
);
