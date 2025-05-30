import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CDependencyFormatter } from "./index.ts";
import { join } from "@std/path";

describe("CDependencyFormatter", () => {
  const cFilesMap = getCFilesMap();
  const depFormatter = new CDependencyFormatter(cFilesMap);
  const burgersh = join(cFilesFolder, "burgers.h");
  const burgersc = join(cFilesFolder, "burgers.c");
  const personnelh = join(cFilesFolder, "personnel.h");
  const main = join(cFilesFolder, "main.c");

  test("main.c", () => {
    const fmain = depFormatter.formatFile(main);
    expect(fmain).toBeDefined();
    expect(fmain.id).toBe(main);
    expect(fmain.dependencies[burgersh]).toBeDefined();
    expect(fmain.dependencies[burgersc]).not.toBeDefined();
    expect(fmain.dependencies[personnelh]).toBeDefined();
    expect(fmain.dependencies["<stdio.h>"]).toBeDefined();
    expect(fmain.dependencies[personnelh].isExternal).toBe(false);
    expect(fmain.dependencies[burgersh].isExternal).toBe(false);
    expect(fmain.dependencies["<stdio.h>"].isExternal).toBe(true);
    expect(fmain.dependencies[burgersh].symbols["Burger"]).toBeDefined();
    expect(fmain.dependencies[burgersh].symbols["create_burger"]).toBeDefined();
    expect(fmain.dependencies[personnelh].symbols["Employee"]).toBeDefined();
    expect(
      fmain.dependencies[personnelh].symbols["create_employee"],
    ).toBeDefined();
    expect(
      fmain.dependencies[personnelh].symbols["print_employee_details"],
    ).toBeDefined();
    expect(fmain.symbols["main"]).toBeDefined();
    expect(fmain.symbols["main"].type).toBe("function");
    expect(fmain.symbols["main"].lineCount > 1).toBe(true);
    expect(fmain.symbols["main"].characterCount > 1).toBe(true);
    expect(fmain.symbols["main"].dependents).toBeDefined();
    expect(fmain.symbols["main"].dependencies).toBeDefined();
    expect(fmain.symbols["main"].dependencies[burgersh]).toBeDefined();
    expect(fmain.symbols["main"].dependencies[burgersh].isExternal).toBe(false);
    expect(fmain.symbols["main"].dependencies[burgersh].symbols["Burger"]).toBe(
      "Burger",
    );
    expect(
      fmain.symbols["main"].dependencies[burgersh].symbols["create_burger"],
    ).toBe("create_burger");
    expect(fmain.symbols["main"].dependencies[personnelh]).toBeDefined();
    expect(fmain.symbols["main"].dependencies[personnelh].isExternal).toBe(
      false,
    );
    expect(
      fmain.symbols["main"].dependencies[personnelh].symbols["Employee"],
    ).toBe("Employee");
    expect(
      fmain.symbols["main"].dependencies[personnelh].symbols["create_employee"],
    ).toBe("create_employee");
    expect(
      fmain.symbols["main"].dependencies[personnelh].symbols[
        "print_employee_details"
      ],
    ).toBe("print_employee_details");
    expect(fmain.symbols["main"].dependencies["<stdio.h>"]).not.toBeDefined();
  });
});
