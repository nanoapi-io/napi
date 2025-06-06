package io.nanoapi.testfiles.food;

import java.io.File;
import java.lang.System;

public class Burger<T> implements Food {

    public static int restaurantCount = 1;

    public void eat() {
        System.out.println("Yummy !");
    }

    public double getPrice() {
        return 2.0;
    }

    public double getCalories() {
        return 500.0;
    }

    public static void advertisement() {
        System.out.println("Mmmmm Burger King");
    }
}
