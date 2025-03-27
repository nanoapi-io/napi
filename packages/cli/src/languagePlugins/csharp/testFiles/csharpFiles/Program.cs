using MyNamespace;
using HalfNamespace;
using OuterNamespace.OuterClass.OuterInnerClass;
using OuterNamespace.InnerNamespace;
using BeefBurger;

namespace Tests
{
    class Program
    {
        static void Main(string[] args)
        {
            Bun beefBun = new Bun();
            ChickenBurger.Bun chickenBun = new ChickenBurger.Bun();
            MyClass myClass = new MyClass();
            myClass.MyMethod();
            Gordon gordon = new Gordon();
            gordon.Crowbar();
            Freeman freeman = new Freeman();
            freeman.Shotgun();
            OuterInnerClass outerInnerClass = new OuterInnerClass();
            outerInnerClass.OuterInnerMethod();
            InnerClass innerClass = new InnerClass();
            innerClass.InnerMethod();
            OrderStatus orderStatus = OrderStatus.Pending;
            System.Math.Abs(-1).Equals(1).ToString();
        }
    }
}
