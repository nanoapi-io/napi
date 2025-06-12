// Code segments taken from the Pokémon Fire Red/Leaf Green decomp project
// https://github.com/pret/pokefirered
#include <stdbool.h>

#define BARD_SONG_LENGTH 14
#define PLAYER_NAME_LENGTH 7
#define TRAINER_ID_LENGTH 4
#define NUM_STORYTELLER_TALES 5
#define GIDDY_MAX_TALES 6
#define GIDDY_MAX_QUESTIONS 10
#define NUM_TRADER_ITEMS 5

struct MauvilleManCommon
{
    int id;
};

struct MauvilleManBard
{
    /*0x00*/ int id;
    /*0x02*/ int songLyrics[BARD_SONG_LENGTH];
    /*0x0E*/ int temporaryLyrics[BARD_SONG_LENGTH];
    /*0x1A*/ int playerName[PLAYER_NAME_LENGTH + 1];
    /*0x22*/ int filler_2DB6[0x3];
    /*0x25*/ int playerTrainerId[TRAINER_ID_LENGTH];
    /*0x29*/ bool hasChangedSong;
    /*0x2A*/ int language;
}; /*size = 0x2C*/

struct MauvilleManStoryteller
{
    int id;
    bool alreadyRecorded;
    int filler2[2];
    int gameStatIDs[NUM_STORYTELLER_TALES];
    int trainerNames[NUM_STORYTELLER_TALES][PLAYER_NAME_LENGTH];
    int statValues[NUM_STORYTELLER_TALES][4];
    int language[NUM_STORYTELLER_TALES];
};

struct MauvilleManGiddy
{
    /*0x00*/ int id;
    /*0x01*/ int taleCounter;
    /*0x02*/ int questionNum;
    /*0x04*/ int randomWords[GIDDY_MAX_TALES];
    /*0x18*/ int questionList[GIDDY_MAX_QUESTIONS];
    /*0x20*/ int language;
}; /*size = 0x2C*/

struct MauvilleManHipster
{
    int id;
    bool alreadySpoken;
    int language;
};

struct MauvilleOldManTrader
{
    int id;
    int decorIds[NUM_TRADER_ITEMS];
    int playerNames[NUM_TRADER_ITEMS][11];
    int alreadyTraded;
    int language[NUM_TRADER_ITEMS];
};

typedef union OldMan
{
    struct MauvilleManCommon common;
    struct MauvilleManBard bard;
    struct MauvilleManGiddy giddy;
    struct MauvilleManHipster hipster;
    struct MauvilleOldManTrader trader;
    struct MauvilleManStoryteller storyteller;
    int filler[0x40];
} OldMan;
