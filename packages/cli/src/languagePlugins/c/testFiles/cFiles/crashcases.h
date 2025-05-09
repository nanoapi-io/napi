struct ObjectEvent {
    int id;
};

struct Sprite {
    int x;
    int y;
};

int PlaceholderFunction(struct ObjectEvent *oe, struct Sprite *s);

int (*const gMovementTypeFuncs_WanderAround[])(struct ObjectEvent *, struct Sprite *) = {
    PlaceholderFunction,
    PlaceholderFunction,
    PlaceholderFunction,
    PlaceholderFunction,
    PlaceholderFunction,
    PlaceholderFunction,
    PlaceholderFunction,
};
