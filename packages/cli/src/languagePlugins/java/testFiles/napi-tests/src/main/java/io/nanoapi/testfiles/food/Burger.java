package io.nanoapi.testfiles.food;

import java.io.File;
import java.lang.System;

public class Burger<T> implements Food {

    public void eat() {
        System.out.println("Yummy !");
    }

    public double getPrice() {
        return 2.0;
    }

    public double getCalories() {
        return 500.0;
    }
}
