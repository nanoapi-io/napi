package io.nanoapi.testfiles.food;

public class Steak implements Food {

    public void eat() {
        System.out.println("Yum !");
    }

    public double getPrice() {
        return 1.5;
    }

    public double getCalories() {
        return 200;
    }

    private static class Tapeworm {
        // Uh oh !!
    }
}
