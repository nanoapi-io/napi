package io.nanoapi.testfiles.food.goron;

import io.nanoapi.testfiles.food.Food;

public class Pebble implements Food {

    public void eat() {
        System.out.println("crunch !");
    }

    public double getPrice() {
        return 0.01;
    }

    public double getCalories() {
        return 1;
    }

    public class Sandworm {
        // Gorons get tapeworms to ?!
    }
}
