import { conf } from "../config";

export function evLog(level: "debug" | "info" | "error", msg: string, ...info: any[]) {
  if (level === "debug" && !conf.debug) return;
  if (level === "error") {
    console.warn(new Date().toLocaleString(), "EHVP:" + msg, ...info);
  } else {
    console.info(new Date().toLocaleString(), "EHVP:" + msg, ...info);
  }
}
