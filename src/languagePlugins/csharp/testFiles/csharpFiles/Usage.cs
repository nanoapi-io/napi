global using System.IO;
using System;
using System.Collections.Generic;
using static System.Math;
using Guy = MyApp.Models.User;
using Valve = HalfNamespace;
class Usage
{
    public void ReadFile()
    {
        using (var reader = new System.IO.StreamReader("file.txt"))
        {
            try
            {
                string content = reader.ReadToEnd();
                Console.WriteLine(content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading file: {ex.Message}");
            }
        }
    }
}
