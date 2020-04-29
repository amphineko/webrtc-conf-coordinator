using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Ikazuchi.Data.Models.Users
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        [PersonalData] [Required] public string ScreenName { get; set; } = "";
    }
}