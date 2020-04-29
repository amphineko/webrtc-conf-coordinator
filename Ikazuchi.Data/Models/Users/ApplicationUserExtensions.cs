using System;
using System.Collections.Generic;
using System.Text;

namespace Ikazuchi.Data.Models.Users
{
    public static class ApplicationUserExtensions
    {
        public static string GetDisplayName(this ApplicationUser user, bool loggedIn)
        {
            if (user.ScreenName == null || user.ScreenName.Trim().Equals(""))
                return loggedIn ? user.Email : "No name";
            else
                return user.ScreenName;
        }
    }
}