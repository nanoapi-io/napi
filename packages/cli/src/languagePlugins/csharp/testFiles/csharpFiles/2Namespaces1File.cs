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
    public class Cheese { }
    public class Bun { }
}
namespace ChickenBurger
{
    public class Chicken { }
    public class Salad { }
    public class Bun { }
}
