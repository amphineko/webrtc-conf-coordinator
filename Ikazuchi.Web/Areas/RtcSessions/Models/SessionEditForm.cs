using System;
using System.ComponentModel.DataAnnotations;

namespace Ikazuchi.Web.Areas.RtcSessions.Models
{
    public class SessionEditForm
    {
        [Required] public string Description { get; set; }

        public Guid Id { get; set; }

        [Required] public string Title { get; set; }

        [Required] public SessionVisibility Visibility { get; set; }
    }
}