using HalfNamespace;
using MyApp.Models; // Useless using directive

namespace MyApp.BeefBurger
{
    public class Steak
    {
        private Gordon gordon;

        public Steak(Gordon gordon)
        {
            this.gordon = gordon;
        }

        public void Cook()
        {
            Console.WriteLine("Gordon, we need to cook.");
        }
    }
    public static class Cheese
    {
        public static void Melt(this Steak steak)
        {
            Console.WriteLine("Cheese melted.");
        }
    }
    public class Bun { }
}
namespace ChickenBurger
{
    public class Chicken { }
    public class Salad<T>
    {
        public T Item { get; set; }
        public void Add(T item)
        {
            Item = item;
        }
    }
    public class Bun { }
}
