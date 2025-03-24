public class User
{
    public string Name { get; set; }
    private string Password { get; set; }
    string Email { get; set; }
}
public struct Order
{
    public int OrderId;
    public string Description;
}
public enum OrderStatus
{
    Pending,
    Completed
}
public interface IOrder
{
    void Process();
}
public delegate void OrderDelegate(int orderId);
