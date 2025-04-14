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

class HeadCrab
{
    public void Bite(Freeman freeman)
    {
        freeman.Health -= 10;
    }
}
