using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Ikazuchi.Data.Models.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ikazuchi.Data.Models.Rtc
{
    public class RtcSession
    {
        [Display(Name = "Created at")]
        [Required]
        public DateTime CreationTime { get; set; }

        [ForeignKey("CreatorId")] [Required] public virtual ApplicationUser Creator { get; set; }

        /// <summary>
        ///     This is field is required but allowed to be blank (i.e empty string "").
        /// </summary>
        [Required]
        public string Description { get; set; }
        
        [Required] public bool Deleted { get; set; } = false;

        [Key] public Guid Id { get; set; }

        public byte[] Passphrase;

        public byte[] PassphraseSalt;

        [Required] public bool Public { get; set; }

        [Required] public string Title { get; set; }

        public class EntityConfiguration : IEntityTypeConfiguration<RtcSession>
        {
            public void Configure(EntityTypeBuilder<RtcSession> builder)
            {
                builder.Property(t => t.CreationTime).ValueGeneratedOnAdd();
            }
        }
    }
}