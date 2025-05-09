
#define CPU_FAST_SET_SRC_FIXED 0x01000000

void CpuFastSet(const void *src, void *dest, unsigned int control);

#define CpuFastFill(value, dest, size)                               \
{                                                                    \
    vu32 tmp = (vu32)(value);                                        \
    CpuFastSet((void *)&tmp,                                         \
               dest,                                                 \
               CPU_FAST_SET_SRC_FIXED | ((size)/(32/8) & 0x1FFFFF)); \
}

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
