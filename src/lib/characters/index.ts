import arjun from './arjun';
import meera from './meera';
import rohan from './rohan';
import priya from './priya';
import sameer from './sameer';
import nisha from './nisha';
import { ICharacter } from '@/types';

export const characters: Record<string, ICharacter> = {
  arjun,
  meera,
  rohan,
  priya,
  sameer,
  nisha,
};

export const defaultCharacterIds = ['arjun', 'meera'];

export function getCharacter(id: string): ICharacter | undefined {
  return characters[id];
}

export function getAllCharacters(): ICharacter[] {
  return Object.values(characters);
}

export function getDefaultCharacters(): ICharacter[] {
  return defaultCharacterIds.map((id) => characters[id]);
}

export function getCharactersByIds(ids: string[]): ICharacter[] {
  return ids.map((id) => characters[id]).filter(Boolean);
}
