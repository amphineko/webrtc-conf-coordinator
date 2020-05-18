using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Numerics;
using System.Text;

namespace Ikazuchi.Web.Common
{
    public static class Base58Encoding
    {
        private const string Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

        private static readonly IReadOnlyDictionary<char, byte> _dictionary;

        static Base58Encoding()
        {
            var dictionary = new Dictionary<char, byte>();
            for (var i = 0; i < Alphabet.Length; i++)
                dictionary[Alphabet[i]] = (byte) i;
            _dictionary = new ReadOnlyDictionary<char, byte>(dictionary);
        }

        public static string Encode(BigInteger bi)
        {
            var result = new StringBuilder();
            while (bi > 0)
            {
                var remainder = (int) (bi % 58);
                bi /= 58;
                result.Insert(0, Alphabet[remainder]);
            }

            return result.ToString();
        }

        public static bool TryDecode(string data, out BigInteger output)
        {
            output = 0;

            foreach (var ch in data)
            {
                if (!_dictionary.ContainsKey(ch))
                    return false;

                output = output * 58 + _dictionary[ch];
            }

            return true;
        }
    }
}