import { javaFilesFolder } from "./index.ts";
import { join } from "@std/path";

// Root
export const APP = join(javaFilesFolder, "App.java");

// Food package
export const CONDIMENT = join(javaFilesFolder, "food/Condiment.java");
export const FOOD = join(javaFilesFolder, "food/Food.java");
export const STEAK = join(javaFilesFolder, "food/Steak.java");
export const BURGER = join(javaFilesFolder, "food/Burger.java");
export const DOUBLEBURGER = join(javaFilesFolder, "food/DoubleBurger.java");
