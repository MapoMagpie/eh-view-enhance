import { conf } from "../config";

export function evLog(msg: string, ...info: any[]) {
  if (conf.debug) {
    console.log(new Date().toLocaleString(), "EHVP:" + msg, ...info);
  }
}
