using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class AppUser : IdentityUser
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.Customer;
}

public static class UserRoles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}
