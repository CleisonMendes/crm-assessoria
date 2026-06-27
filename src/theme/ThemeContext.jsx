import { createContext, useContext } from "react";
import { TH } from "./themes.js";

export const TC = createContext(TH.navy);
export const useT = () => useContext(TC);
