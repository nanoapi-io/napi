using MyNamespace;
using HalfNamespace;
using static OuterNamespace.OuterClass;
using OuterNamespace.InnerNamespace;
using MyApp.Models;
using MyApp.BeefBurger;

namespace Tests
{
    class Program
    {
        static void Main(string[] args)
        {
            // Test for ambiguity resolution
            Bun beefBun = new Bun();
            ChickenBurger.Bun chickenBun = new ChickenBurger.Bun();
            // Regular usage of imported namespaces
            MyClass myClass = new MyClass();
            Gordon gordon = new Gordon();
            gordon.Crowbar();
            // Class that is in no namespace
            Freeman freeman = new Freeman();
            freeman.Bite();
            // Nested classes
            OuterInnerClass outerInnerClass = new OuterInnerClass();
            InnerClass innerClass = new InnerClass();
            // Enum
            OrderStatus orderStatus = OrderStatus.Pending;
            // Static class
            System.Math.Abs(-1).Equals(1).ToString();
        }
    }
}
