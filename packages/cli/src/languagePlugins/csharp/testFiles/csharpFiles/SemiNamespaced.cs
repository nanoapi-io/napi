namespace HalfNamespace
{
    public class Gordon
    {
        public void Crowbar()
        {
            Console.WriteLine("MyMethod");
        }
    }
}

public class Freeman
{
    public int Health { get; set; }
    public void Shotgun()
    {
        Console.WriteLine("MyMethod");
    }
}

static class HeadCrab
{
    public static void Bite(this Freeman freeman)
    {
        freeman.Health -= 10;
    }
    public static void Heal(this Freeman freeman)
    {
        freeman.Health += 10;
    }
}
