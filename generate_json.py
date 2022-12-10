import argparse
import csv
import json
import logging
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List


LOGLEVEL = os.environ.get('LOGLEVEL', 'INFO').upper()
logging.basicConfig(level=LOGLEVEL)

@dataclass
class Person:
    number: str
    name: str
    subjects: str


@dataclass
class CandidatingList:
    listname: List[str]
    people: List[Person]


def process_file(input_file: Path) -> CandidatingList:
    with open(input_file, "r") as file:
        res = CandidatingList([file.readline().strip().strip(",").strip()], [])
        reader = csv.DictReader(file)
        for line in reader:
            if "Listenplatz / Position" not in line:
                logging.error(
                    "Incorrect csv format, could not find 'Listenplatz / Position'")
                return None
            person = Person(line["Listenplatz / Position"],
                            f"{line['Vorname(n) / First name(s)'].strip()} {line['Nachname / Last name'].strip()}", line["Studienfach / Degree programme"])
            res.people.append(person)
        logging.debug("finished with %s and generated %s", input_file, res)
    return res


def main(input_folder: Path, output_filename: Path):
    result: List[CandidatingList] = []
    for f in input_folder.glob("*"):
        if not os.path.isfile(f) or f.stem.startswith("."):
            logging.debug("Skipping file %s", f)
            continue
        logging.debug("Currently processing file %s", f)
        r = process_file(f)
        result.append(r)

    with open(output_filename, "w") as f:
        json.dump([asdict(x) for x in result], f, ensure_ascii=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog='generate_json',
        description='Generate needed json format from CSV tables.',
        epilog='')

    parser.add_argument("input_folder", type=Path, help="folder where the csv files lie")
    parser.add_argument("output_filename", type=Path,
                        help="filename to output the json file to")

    args = parser.parse_args()

    main(args.input_folder, args.output_filename)
