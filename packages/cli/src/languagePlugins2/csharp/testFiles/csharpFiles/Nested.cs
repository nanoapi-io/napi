namespace OuterNamespace
{
    public class OuterClass
    {
        public void OuterMethod()
        {
            Console.WriteLine("OuterMethod");
        }
        public class OuterInnerClass
        {
            public void OuterInnerMethod()
            {
                Console.WriteLine("OuterInnerMethod");
            }
        }
    }
    namespace InnerNamespace
    {
        public class InnerClass
        {
            public void InnerMethod()
            {
                Console.WriteLine("InnerMethod");
            }
        }
    }
}
