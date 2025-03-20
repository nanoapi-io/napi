using MyNamespace;
using HalfNamespace;
using OuterNamespace;
using OuterNamespace.InnerNamespace;

namespace Tests
{
    class Program
    {
        static void Main(string[] args)
        {
            BeefBurger.Bun beefBun = new BeefBurger.Bun();
            ChickenBurger.Bun chickenBun = new ChickenBurger.Bun();
            MyClass myClass = new MyClass();
            myClass.MyMethod();
            Gordon gordon = new Gordon();
            gordon.Crowbar();
            Freeman freeman = new Freeman();
            freeman.Shotgun();
            OuterClass.OuterInnerClass outerInnerClass = new OuterClass.OuterInnerClass();
            outerInnerClass.OuterInnerMethod();
            InnerClass innerClass = new InnerClass();
            innerClass.InnerMethod();
            OrderStatus orderStatus = OrderStatus.Pending;
        }
    }
}
