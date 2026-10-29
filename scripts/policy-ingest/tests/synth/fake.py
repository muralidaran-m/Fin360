"""Fake Indian personal details for the synthetic test set. None of these are real people."""
from __future__ import annotations

import random
from dataclasses import dataclass

from policy_ingest.recognizers import verhoeff_check_digit

FIRST = ["Ravi", "Meera", "Arjun", "Lakshmi", "Venkata", "Priya", "Karthik", "Divya", "Suresh",
         "Ananya", "Harish", "Kavitha", "Naveen", "Shalini", "Vignesh", "Deepa", "Rohit", "Sneha",
         "Pradeep", "Revathi", "Gayathri", "Manoj", "Nandini"]
LAST = ["Iyer", "Raghavan", "Subramanian", "Krishnamurthy", "Sharma", "Nair", "Reddy", "Menon",
        "Pillai", "Venkatesan", "Chandrasekar", "Gopalan", "Rao", "Mukherjee", "Desai", "Kulkarni"]
STREETS = ["Gandhi Road", "Nehru Street", "Temple Street", "Lake View Road", "Station Road",
           "2nd Main Road", "Market Street", "Church Lane"]
BUILDINGS = ["Lotus Apartments", "Green Park Residency", "Sai Krupa Towers", "Sunrise Enclave"]
AREAS = [("Adyar", "Chennai", "600020"), ("Jayanagar", "Bengaluru", "560041"),
         ("Kothrud", "Pune", "411038"), ("Banjara Hills", "Hyderabad", "500034"),
         ("Velachery", "Chennai", "600042"), ("Indiranagar", "Bengaluru", "560038")]
UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
# Names that are also insurer brand words (Aditya Birla, LIC Jeevan Anand) are left out on
# purpose: brand words are kept by design, so a person sharing one is only caught by the full
# name or the deny-list. That limitation is documented in lexicon.KEEP_TERMS.


@dataclass
class Person:
    first: str
    last: str

    @property
    def full(self) -> str:
        return f"{self.first} {self.last}"


class Faker:
    def __init__(self, seed: int):
        self.r = random.Random(seed)
        self._used: set[str] = set()

    def person(self, last: str | None = None) -> Person:
        while True:
            p = Person(self.r.choice(FIRST), last or self.r.choice(LAST))
            if p.first not in self._used:
                self._used.add(p.first)
                return p

    def pan(self, holder_last: str) -> str:
        letters = "".join(self.r.choice(UPPER) for _ in range(3))
        return f"{letters}P{holder_last[0].upper()}{self.r.randint(1000, 9999)}{self.r.choice(UPPER)}"

    def aadhaar(self) -> str:
        body = str(self.r.randint(2, 9)) + "".join(str(self.r.randint(0, 9)) for _ in range(10))
        return body + verhoeff_check_digit(body)

    def mobile(self) -> str:
        return str(self.r.randint(6, 9)) + "".join(str(self.r.randint(0, 9)) for _ in range(9))

    def digits(self, n: int) -> str:
        return str(self.r.randint(1, 9)) + "".join(str(self.r.randint(0, 9)) for _ in range(n - 1))

    def address(self) -> list[str]:
        area, city, pin = self.r.choice(AREAS)
        return [
            f"Flat {self.r.randint(1, 12)}{self.r.choice('ABCD')}, {self.r.choice(BUILDINGS)},",
            f"{self.r.randint(3, 120)} {self.r.choice(STREETS)}, {area},",
            f"{city} - {pin}",
        ]

    def dob(self) -> tuple[int, int, int]:
        return self.r.randint(1, 28), self.r.randint(1, 12), self.r.randint(1975, 1992)
